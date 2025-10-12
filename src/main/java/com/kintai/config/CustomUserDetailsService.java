package com.kintai.config;

import com.kintai.entity.UserAccount;
import com.kintai.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * カスタムUserDetailsService
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {
    
    @Autowired
    private UserAccountRepository userAccountRepository;
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Optional<UserAccount> userOpt = userAccountRepository.findByUsernameAndEnabled(username, true);
        
        if (userOpt.isEmpty()) {
            throw new UsernameNotFoundException("ユーザーが見つかりません: " + username);
        }
        
        return userOpt.get();
    }
}
